# Simple EC2 instance
resource "aws_instance" "{{app_name}}" {
  ami           = "{{ami_id}}"
  instance_type = "{{instance_type}}"
  
  tags = {
    Name = "{{app_name}}"
  }
}
